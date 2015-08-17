package com.psddev.cms.view;

import com.psddev.dari.util.TypeDefinition;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Creator of view objects from a model object.
 *
 * @param <M> the model type to create the view from.
 * @param <V> the view type to create.
 */
public interface ViewCreator<M, V> {

    static final Logger LOGGER = LoggerFactory.getLogger(ViewCreator.class);

    /**
     * Creates a view based on the specified model in the current view request.
     *
     * @param model the backing model for the view to be created.
     * @param request the current view request.
     * @return the newly created view.
     */
    V createView(M model, ViewRequest request);

    /**
     * Finds the view creator that should be used to create views of the
     * specified {@code viewClass} type based on the specified {@code model}.
     *
     * @param model the model from which the view should be created.
     * @param viewClass the class of the view that should be created.
     * @param <M> the model type the view creator creates from.
     * @param <V> the view type the view creator creates.
     * @return the view creator of model to view.
     */
    static <M, V> ViewCreator<M, V> findCreator(M model, Class<V> viewClass) {

        if (model == null) {
            return null;
        }

        Class<?> modelClass = model.getClass();

        // we only expect to find one.
        List<Class<? extends ViewCreator>> creatorClasses = new ArrayList<>();

        Set<Class<? extends ViewCreator>> allCreatorClasses = new LinkedHashSet<>();

        for (Class<?> annotatableClass : ViewUtils.getAnnotatableClasses(modelClass)) {

            allCreatorClasses.addAll(
                    Arrays.stream(annotatableClass.getAnnotationsByType(ViewMapping.class))
                            .map(ViewMapping::value)
                            .collect(Collectors.toList()));
        }

        allCreatorClasses.forEach(creatorClass -> {
            /*
             * TODO: Once https://github.com/perfectsense/dari/pull/105 is merged, replace with:
             *
             * TypeDefinition typeDef = TypeDefinition.getInstance(creatorClass);
             * Class<?> declaredViewClass = typeDef.getInferredGenericTypeArgumentClass(ViewCreator.class, 0);
             * Class<?> declaredModelClass = typeDef.getInferredGenericTypeArgumentClass(ViewCreator.class, 1);
             */
            Class<?> declaredViewClass = ViewUtils.getGenericViewTypeArgument(creatorClass);
            Class<?> declaredModelClass = ViewUtils.getGenericModelTypeArgument(creatorClass);

            if (((declaredViewClass != null && viewClass.isAssignableFrom(declaredViewClass)) || viewClass.isAssignableFrom(creatorClass))
                    && declaredModelClass != null && declaredModelClass.isAssignableFrom(modelClass)) {

                creatorClasses.add(creatorClass);
            }
        });

        if (!creatorClasses.isEmpty()) {

            if (creatorClasses.size() == 1) {

                Class<? extends ViewCreator> creatorClass = creatorClasses.get(0);

                try {
                    @SuppressWarnings("unchecked")
                    ViewCreator<M, V> creator = (ViewCreator<M, V>) TypeDefinition.getInstance(creatorClass).newInstance();

                    return creator;
                } catch (Exception e) {
                    LOGGER.warn("Unable to create view creator of type [" + creatorClass.getName() + "]");
                }

            } else {
                LOGGER.warn("Found multiple conflicting view creator mappings... " + creatorClasses);
            }
        }

        return null;
    }
}

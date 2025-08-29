
package org.springframework.samples.petclinic.vet

import java.util.ArrayList

import jakarta.xml.bind.annotation.XmlElement
import jakarta.xml.bind.annotation.XmlRootElement

@XmlRootElement
open class Vets {

    private var vets: MutableList<Vet>? = null

    @get:XmlElement
    val vetList: MutableList<Vet>
        get() {
            if (vets == null) {
                vets = ArrayList()
            }
            return vets!!
        }
}
